

public class Commit 
{
    private int origin;

    private String action;
    private int vote;
    private String content;

    public Commit() {}

    public void parse(String message)
    {

    }

    public String toString(boolean isVote)
    {
        if(isVote) {return Integer.toString(origin) + "," + action +","+ Integer.toString(vote);}
        return Integer.toString(origin) + "," + action +","+ content;
    }

}